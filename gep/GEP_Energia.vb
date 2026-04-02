
Sub GEP_Energia()

'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, ENE, filepath, var, header, filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim i
Dim Val(25)

Val(09)= 1.0
Val(10)= SmartTags("Pos_P1A03") 'Consumo MC1
Val(11)= SmartTags("P1P02.Sts_Corrente") 'Consumo MC2
Val(12)= SmartTags("Z3M01M1_LEI_ENE_CONS") 'Consumo MC3
Val(13)= SmartTags("CCM1_ConsumoKWh") 'Consumo CCM1 - Moagem 1
'Val(14)= SmartTags("CCM2_LEI_ENE_CONS") 'Consumo CCM2 - Moagem 2
Val(15)= SmartTags("P2P03.Sts.current") 'Consumo CCM3 - Expedição 	
Val(16)= SmartTags("P2P03.Sts.currentPerc") 'Consumo CCM4 - Utilidades
Val(17)= SmartTags("P3P03.Sts_Corrente") 'Consumo CCM5 - Moagem 3
Val(18)= SmartTags("ENT_GER.LEI_TEN_L1_L2")  'Tensão entre L1 e L2
Val(19)= SmartTags("ENT_GER.LEI_TEN_L2_L3")  'Tensão entre L2 e L3
Val(20)= SmartTags("ENT_GER.LEI_TEN_L1_L3")  'Tensão entre L1 e L3
Val(25)= 00
'Formarta e arredunda os valores 
For i = 9 To 21
	
        If i < 21 Then
     Val(i) =   FormatNumber(Val(i),2,True,False,False)
       
           End If 
Next 

	

Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
 
DataTime= d & Mon & Y

ENE = DataTime & ".ENE"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If 

'Salva no pasta c:\\Relatorios
Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & ENE
filepath = "Z:\\" & folder_day & "\" & ENE


If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & Val(09) & ";" & Val(10) & ";" & Val(11) & ";" & Val(12) & ";" & Val(13) & ";" & Val(14) & ";" & Val(15) & ";" & Val(16) & ";" & Val(17) & ";" & Val(18) & ";" & Val(19) & ";" & Val(20) 
fso3.Close


'Salva no pasta z:\\
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & Val(09) & ";" & Val(10) & ";" & Val(11) & ";" & Val(12) & ";" & Val(13) & ";" & Val(14) & ";" & Val(15) & ";" & Val(16) & ";" & Val(17) & ";" & Val(18) & ";" & Val(19) & ";" & Val(20) 
fso3.Close


End Sub



